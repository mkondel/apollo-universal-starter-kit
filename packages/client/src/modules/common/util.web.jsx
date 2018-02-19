/* eslint-disable react/display-name */
import React from 'react';
import PropTypes from 'prop-types';
import { startCase } from 'lodash';
import { Link } from 'react-router-dom';

import Field from '../../utils/FieldAdapter';
import FieldArray from '../../utils/FieldArrayAdapter';
import {
  RenderField,
  RenderSelect,
  RenderDate,
  RenderSwitch,
  Button,
  Popconfirm,
  Switch,
  FormItem,
  Row,
  Col,
  Input,
  Icon
} from './components/web';

export const createColumnFields = (
  schema,
  link,
  orderBy,
  renderOrderByArrow,
  hendleUpdate,
  hendleDelete,
  onCellChange,
  customTableColumns
) => {
  let columns = [];

  for (const key of schema.keys()) {
    const value = schema.values[key];
    const hasTypeOf = targetType => value.type === targetType || value.type.prototype instanceof targetType;

    if (value.show !== false && key !== 'id') {
      if (value.type.isSchema) {
        let sortBy = 'name';
        for (const remoteKey of value.type.keys()) {
          const remoteValue = value.type.values[remoteKey];
          if (remoteValue.sortBy) {
            sortBy = remoteKey;
          }
        }
        columns.push({
          title: (
            <a onClick={e => orderBy(e, key)} href="#">
              {startCase(key)} {renderOrderByArrow(key)}
            </a>
          ),
          dataIndex: key,
          key: key,
          width: 300,
          render: text => {
            return text[sortBy];
          }
        });
      } else if (hasTypeOf(Boolean)) {
        columns.push({
          title: (
            <a onClick={e => orderBy(e, key)} href="#">
              {startCase(key)} {renderOrderByArrow(key)}
            </a>
          ),
          dataIndex: key,
          key: key,
          width: 100,
          render: (text, record) => {
            const data = {};
            data[key] = !text;
            return <Switch checked={text} onClick={() => hendleUpdate(data, record.id)} />;
          }
        });
      } else if (value.type.constructor !== Array) {
        columns.push({
          title: (
            <a onClick={e => orderBy(e, key)} href="#">
              {startCase(key)} {renderOrderByArrow(key)}
            </a>
          ),
          dataIndex: key,
          key: key,
          render: (text, record) =>
            customTableColumns[key] && customTableColumns[key]['render'] ? (
              customTableColumns[key]['render'](text, record)
            ) : (
              <EditableCell
                value={
                  customTableColumns[key] && customTableColumns[key]['render']
                    ? customTableColumns[key]['render'](text, record)
                    : text
                }
                onChange={onCellChange(key, record.id, hendleUpdate)}
              />
            )
        });
      }
    }
  }

  columns.push({
    title: 'Actions',
    key: 'actions',
    width: 150,
    render: (text, record) => [
      <Link className="link" to={`/${link}/${record.id}`} key="edit">
        <Button color="primary" size="sm">
          Edit
        </Button>
      </Link>,
      <Popconfirm title="Sure to delete?" onConfirm={() => hendleDelete(record.id)} key="delete">
        <Button color="primary" size="sm">
          Delete
        </Button>
      </Popconfirm>
    ]
  });

  return columns;
};

const tailFormItemLayout = {
  wrapperCol: {
    xs: {
      span: 24,
      offset: 0
    },
    sm: {
      span: 16,
      offset: 6
    }
  }
};

const RenderEntry = ({ handleChange, fields, formdata, formItemLayout, schema, meta: { error, submitFailed } }) => (
  <Row>
    <Col span={12} offset={6}>
      {fields.map((field, index) => (
        <div key={index} className="field-array-form">
          {createFormFields(handleChange, schema, formdata, formItemLayout, `${field}.`)}
          <FormItem {...tailFormItemLayout}>
            <Button color="primary" size="sm" onClick={() => fields.remove(index)}>
              Delete
            </Button>
          </FormItem>
        </div>
      ))}
      <FormItem {...tailFormItemLayout}>
        {submitFailed && error && <span>{error}</span>}
        <Button color="dashed" onClick={() => fields.push({})} style={{ width: '180px' }}>
          Add field
        </Button>
      </FormItem>
    </Col>
  </Row>
);

RenderEntry.propTypes = {
  handleChange: PropTypes.func,
  fields: PropTypes.object,
  formdata: PropTypes.object,
  schema: PropTypes.object,
  meta: PropTypes.object,
  formItemLayout: PropTypes.object
};

export const mapFormPropsToValues = (schema, formdata) => {
  let fields = {};

  for (const key of schema.keys()) {
    const value = schema.values[key];

    if (key !== 'id' && value.show !== false && value.type.constructor !== Array) {
      fields[key] = formdata ? formdata[key] : '';
    }
  }

  return fields;
};

export const createFormFields = (
  handleChange,
  schema,
  values = {},
  formdata,
  formItemLayout,
  prefix = '',
  batch = false
) => {
  let fields = [];

  for (const key of schema.keys()) {
    const value = schema.values[key];
    const type = value.type.constructor === Array ? value.type[0] : value.type;

    const hasTypeOf = targetType => value.type === targetType || value.type.prototype instanceof targetType;

    if (key !== 'id' && value.show !== false && value.type.constructor !== Array) {
      //let validate = [];
      //if (!value.optional && !batch) {
      //  validate.push(required);
      //}

      let component = RenderField;
      let data = null;
      let value = values ? values[key] : '';

      if (type.isSchema) {
        component = RenderSelect;
        data = formdata[`${key}s`];
      } else if (hasTypeOf(Boolean)) {
        component = RenderSwitch;
      } else if (hasTypeOf(Date)) {
        component = RenderDate;
      }

      fields.push(
        <Field
          name={`${prefix}${key}`}
          key={key}
          component={component}
          data={data}
          value={value}
          type="text"
          label={startCase(key)}
          //validate={validate}
          formItemLayout={formItemLayout}
          onChange={handleChange}
        />
      );
    } else {
      if (value.type.constructor === Array && !batch) {
        fields.push(
          <FieldArray
            name={key}
            key={key}
            component={RenderEntry}
            schema={value.type[0]}
            formdata={formdata}
            formItemLayout={formItemLayout}
            handleChange={handleChange}
          />
        );
      }
    }
  }

  return fields;
};

class EditableCell extends React.Component {
  static propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired
  };

  state = {
    value: this.props.value,
    editable: false
  };
  handleChange = e => {
    const value = e.target.value;
    this.setState({ value });
  };
  check = () => {
    this.setState({ editable: false });
    if (this.props.onChange) {
      this.props.onChange(this.state.value);
    }
  };
  edit = () => {
    this.setState({ editable: true });
  };
  render() {
    const { value, editable } = this.state;
    return (
      <div className="editable-cell">
        {editable ? (
          <div className="editable-cell-input-wrapper">
            <Input value={value} onChange={this.handleChange} onPressEnter={this.check} />
            <Icon type="check" className="editable-cell-icon-check" onClick={this.check} />
          </div>
        ) : (
          <div className="editable-cell-text-wrapper">
            {value || '\u00A0'}
            <Icon type="edit" className="editable-cell-icon" onClick={this.edit} />
          </div>
        )}
      </div>
    );
  }
}